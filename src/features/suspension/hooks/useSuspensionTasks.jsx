import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import {
  listSuspensions, listSuspensionTasks, listSuspensionSubmissions,
  createSuspensionTask, updateSuspensionTask, deleteSuspensionTask,
  gradeSuspensionSubmission, getSubmissionPhotos,
} from '../services/suspensionService'

// Tugas guru: daftar skorsing aktif + tugas milik saya + penilaian.
// Aturan kepemilikan: guru hanya ubah/nilai tugas dengan created_by = dirinya.
// Dipakai TasksPage.
export default function useSuspensionTasks() {
  const { addToast } = useToast()
  const { user, profile } = useAuth()
  const [activeList, setActiveList] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const activeRef = useRef(true)
  const isAdmin = ['developer', 'admin'].includes(profile?.role?.toLowerCase())

  const canManageTask = useCallback((task) => {
    if (!task) return false
    return isAdmin || task.created_by === user?.id
  }, [isAdmin, user])

  const fetchTasks = useCallback(async (suspensionId) => {
    if (!suspensionId) return
    setLoading(true)
    try {
      const [t, s] = await Promise.all([
        listSuspensionTasks(suspensionId),
        listSuspensionSubmissions(suspensionId),
      ])
      if (!activeRef.current) return
      setTasks(t)
      setSubmissions(s)
    } catch (err) {
      if (activeRef.current) addToast(err?.message || 'Gagal memuat tugas.', 'error')
    } finally {
      if (activeRef.current) setLoading(false)
    }
  }, [addToast])

  // Ganti pilihan skorsing: eksplisit dari UI.
  const selectSuspension = useCallback((id) => {
    setSelectedId(id)
    fetchTasks(id)
  }, [fetchTasks])

  // Mount sekali: ambil daftar aktif lalu pilih default. Ganti pilihan
  // lewat selectSuspension (eksplisit). setState di bawah hasil async.
  useEffect(() => {
    activeRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const res = await listSuspensions({ status: 'aktif', search: '', page: 1, pageSize: 100 })
        if (!activeRef.current || cancelled) return
        setActiveList(res.items)
        const first = res.items.length > 0 ? res.items[0].id : ''
        setSelectedId(first)
        if (first) {
          setLoading(true)
          try {
            const [t, s] = await Promise.all([
              listSuspensionTasks(first),
              listSuspensionSubmissions(first),
            ])
            if (!activeRef.current || cancelled) return
            setTasks(t)
            setSubmissions(s)
          } catch (err) {
            if (activeRef.current && !cancelled) addToast(err?.message || 'Gagal memuat tugas.', 'error')
          } finally {
            if (activeRef.current && !cancelled) setLoading(false)
          }
        } else if (activeRef.current && !cancelled) {
          setLoading(false)
        }
      } catch (err) {
        if (activeRef.current && !cancelled) {
          addToast(err?.message || 'Gagal memuat daftar skorsing aktif.', 'error')
          setLoading(false)
        }
      }
    })()
    return () => { cancelled = true; activeRef.current = false }
    // Mount-once; fetch lanjutan lewat selectSuspension/aksi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const myTasks = tasks.filter((t) => isAdmin || t.created_by === user?.id)

  const saveTask = useCallback(async (payload, editing) => {
    setSaving(true)
    try {
      if (editing) {
        if (!canManageTask(editing)) throw new Error('Anda hanya bisa mengubah tugas buatan sendiri.')
        await updateSuspensionTask(editing.id, payload, editing)
        addToast('Tugas diperbarui.', 'success')
      } else {
        await createSuspensionTask({
          ...payload,
          suspension_id: selectedId,
          created_by: user?.id,
        })
        addToast('Tugas ditambahkan.', 'success')
      }
      await fetchTasks(selectedId)
      return { error: null }
    } catch (err) {
      addToast(err?.message || 'Gagal menyimpan tugas.', 'error')
      return { error: err }
    } finally {
      setSaving(false)
    }
  }, [canManageTask, selectedId, user, addToast, fetchTasks])

  const removeTask = useCallback(async (task) => {
    try {
      if (!canManageTask(task)) throw new Error('Anda hanya bisa menghapus tugas buatan sendiri.')
      await deleteSuspensionTask(task.id, task)
      addToast('Tugas dihapus.', 'success')
      await fetchTasks(selectedId)
      return true
    } catch (err) {
      addToast(err?.message || 'Gagal menghapus tugas.', 'error')
      return false
    }
  }, [canManageTask, selectedId, addToast, fetchTasks])

  const grade = useCallback(async (submission, { score, teacherComment }) => {
    try {
      const task = tasks.find((t) => t.id === submission.task_id)
      if (!canManageTask(task)) throw new Error('Anda hanya bisa menilai tugas buatan sendiri.')
      await gradeSuspensionSubmission(submission.id, {
        score, teacherComment, status: 'dinilai', gradedBy: user?.id || null,
      }, submission)
      addToast('Nilai tersimpan.', 'success')
      await fetchTasks(selectedId)
      return true
    } catch (err) {
      addToast(err?.message || 'Gagal menyimpan nilai.', 'error')
      return false
    }
  }, [tasks, canManageTask, user, addToast, fetchTasks, selectedId])

  const fetchPhotos = useCallback(async (submissionId) => {
    try {
      const b64 = await getSubmissionPhotos(submissionId)
      return (b64 || []).map((b) => (String(b).startsWith('data:') ? b : `data:image/jpeg;base64,${b}`))
    } catch (err) {
      addToast(err?.message || 'Gagal memuat foto bukti.', 'error')
      return []
    }
  }, [addToast])

  return {
    activeList, selectedId, setSelectedId: selectSuspension,
    tasks, myTasks, submissions,
    loading, saving, isAdmin,
    canManageTask, saveTask, removeTask, grade, fetchPhotos,
    refresh: () => fetchTasks(selectedId),
  }
}
