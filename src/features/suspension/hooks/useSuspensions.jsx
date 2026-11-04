import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@lib/supabase'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import {
  listSuspensions, getSuspension, createSuspension, updateSuspension,
  generateSuspensionToken, listSuspensionTokens, revokeSuspensionToken,
  searchStudents, searchViolationReports,
} from '../services/suspensionService'
import { jenjangOfGrade } from '../utils/suspensionConstants'

// Daftar skorsing + buat baru + kelola token wali.
// Pola fetch: eksplisit dari handler (mount sekali, ganti query, aksi user,
// realtime). Query dibaca dari ref agar tidak memicu effect fetch.
export default function useSuspensions() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilterState] = useState('aktif')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  // Query selalu dibaca dari ref — perubahan query TIDAK otomatis fetch.
  const queryRef = useRef({ status: 'aktif', search: '', page: 1 })
  const activeRef = useRef(true)
  const channelRef = useRef(null)
  const lastRtRef = useRef(0)

  const doFetch = useCallback(async () => {
    const q = queryRef.current
    setLoading(true)
    setError('')
    try {
      const res = await listSuspensions({ status: q.status, search: q.search, page: q.page, pageSize })
      if (!activeRef.current) return
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      if (!activeRef.current) return
      setError(err?.message || 'Gagal memuat data skorsing.')
    } finally {
      if (activeRef.current) setLoading(false)
    }
  }, [pageSize])

  // Mount sekali + realtime. Tidak ada effect fetch-on-query.
  useEffect(() => {
    activeRef.current = true
    // Fetch-on-mount: hasil async, bukan render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    doFetch().catch(() => {})
    channelRef.current = supabase
      .channel('suspensions_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suspensions' }, () => {
        const now = Date.now()
        if (now - lastRtRef.current > 2000) {
          lastRtRef.current = now
          doFetch().catch(() => {})
        }
      })
      .subscribe()
    return () => {
      activeRef.current = false
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [doFetch])

  // Debounce ketik: setelah 400 mdtk baru fetch.
  useEffect(() => {
    const t = setTimeout(() => {
      queryRef.current = { ...queryRef.current, search, page: 1 }
      setPage(1)
      doFetch().catch(() => {})
    }, 400)
    return () => clearTimeout(t)
    // Fetch manual dari timeout, bukan render cascade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const setStatusFilter = useCallback((s) => {
    setStatusFilterState(s)
    queryRef.current = { ...queryRef.current, status: s, page: 1 }
    setPage(1)
    doFetch().catch(() => {})
  }, [doFetch])

  const handlePage = useCallback((next) => {
    setPage(next)
    queryRef.current = { ...queryRef.current, page: next }
    doFetch().catch(() => {})
  }, [doFetch])

  const suggestJenjang = useCallback((grade) => jenjangOfGrade(grade), [])

  const create = useCallback(async ({ student, jenjang, startDate, endDate, reasonSummary, violationReportId }) => {
    try {
      const data = await createSuspension({
        studentId: student.id, jenjang, startDate, endDate,
        reasonSummary, violationReportId, createdBy: user?.id || null,
      })
      addToast(`Skorsing ${student.name} berhasil dibuat.`, 'success')
      queryRef.current = { ...queryRef.current, page: 1 }
      setPage(1)
      doFetch().catch(() => {})
      return { data, error: null }
    } catch (err) {
      addToast(err?.message || 'Gagal membuat data skorsing.', 'error')
      return { data: null, error: err }
    }
  }, [user, addToast, doFetch])

  const updateStatus = useCallback(async (row, status) => {
    try {
      await updateSuspension(row.id, { status }, row)
      addToast(`Status diubah menjadi ${status}.`, 'success')
      doFetch().catch(() => {})
      return true
    } catch (err) {
      addToast(err?.message || 'Gagal mengubah status.', 'error')
      return false
    }
  }, [addToast, doFetch])

  const detail = useCallback(async (id) => {
    try {
      return await getSuspension(id)
    } catch (err) {
      addToast(err?.message || 'Gagal memuat detail.', 'error')
      return null
    }
  }, [addToast])

  const generateToken = useCallback(async (suspension) => {
    try {
      const tok = await generateSuspensionToken(suspension, user?.id || null)
      addToast('Tautan wali berhasil dibuat.', 'success')
      return { token: tok, error: null }
    } catch (err) {
      addToast(err?.message || 'Gagal membuat tautan.', 'error')
      return { token: null, error: err }
    }
  }, [user, addToast])

  const fetchTokens = useCallback(async (suspensionId) => {
    try {
      return await listSuspensionTokens(suspensionId)
    } catch (err) {
      addToast(err?.message || 'Gagal memuat tautan.', 'error')
      return []
    }
  }, [addToast])

  const revokeToken = useCallback(async (tokenId) => {
    try {
      await revokeSuspensionToken(tokenId, user?.id || null)
      addToast('Tautan wali dicabut.', 'success')
      return true
    } catch (err) {
      addToast(err?.message || 'Gagal mencabut tautan.', 'error')
      return false
    }
  }, [user, addToast])

  const findStudents = useCallback(async (term) => {
    try {
      return await searchStudents(term)
    } catch {
      return []
    }
  }, [])

  const findReports = useCallback(async (studentId) => {
    try {
      return await searchViolationReports(studentId)
    } catch {
      return []
    }
  }, [])

  return {
    items, total, loading, error,
    statusFilter, setStatusFilter, search, setSearch, page, pageSize,
    handlePage, refresh: doFetch,
    create, updateStatus, detail,
    generateToken, fetchTokens, revokeToken,
    findStudents, findReports, suggestJenjang,
  }
}
