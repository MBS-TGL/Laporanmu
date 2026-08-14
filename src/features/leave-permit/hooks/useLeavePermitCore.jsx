import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'

export default function useLeavePermitCore() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [permits, setPermits] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ issuedToday: 0, active: 0, overdue: 0, returnedToday: 0 })
  const channelRef = useRef(null)

  // ─── Search students by name ────────────────────────────────────────────
  const searchStudents = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) return []
    const { data, error } = await supabase
      .from('students')
      .select(`
        id, name, phone, class_id, dorm_id, photo_url,
        classes ( id, name ),
        dorms ( id, ar, building, gender )
      `)
      .ilike('name', `%${searchTerm}%`)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')
      .limit(20)

    if (error) {
      console.error('Error searching students:', error)
      return []
    }
    return data || []
  }, [])

  // ─── Fetch leave permits with filters ───────────────────────────────────
  const fetchPermits = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      let query = supabase
        .from('leave_permits')
        .select(`
          *,
          student:students ( id, name, phone, photo_url, class_id, dorm_id,
            classes ( id, name ),
            dorms ( id, ar, building, gender )
          ),
          issuer:profiles ( id, name ),
          signature:signatures ( id, signature_url ),
          gate_log:gate_logs!gate_log_id ( id, check_in, check_out )
        `)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.dateFrom) {
        query = query.gte('leave_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('leave_date', filters.dateTo)
      }
      if (filters.search) {
        query = query.ilike('student.name', `%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      setPermits(data || [])
      return data || []
    } catch (err) {
      console.error('Error fetching permits:', err)
      addToast('Gagal memuat data izin', 'error')
      return []
    } finally {
      setLoading(false)
    }
  }, [addToast])

  // ─── Fetch stats ────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)

      const [issuedRes, activeRes, overdueRes, returnedRes] = await Promise.all([
        supabase.from('leave_permits').select('id', { count: 'exact', head: true })
          .eq('status', 'issued').eq('leave_date', today),
        supabase.from('leave_permits').select('id', { count: 'exact', head: true })
          .eq('status', 'departed'),
        supabase.from('leave_permits').select('id', { count: 'exact', head: true })
          .eq('status', 'departed').lt('return_deadline', new Date().toISOString()),
        supabase.from('leave_permits').select('id', { count: 'exact', head: true })
          .eq('status', 'returned')
          .gte('updated_at', today),
      ])

      setStats({
        issuedToday: issuedRes.count || 0,
        active: activeRes.count || 0,
        overdue: overdueRes.count || 0,
        returnedToday: returnedRes.count || 0,
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [])

  // ─── Create leave permit ────────────────────────────────────────────────
  const createPermit = useCallback(async (payload) => {
    try {
      const { data, error } = await supabase
        .from('leave_permits')
        .insert({
          student_id: payload.studentId,
          phone: payload.phone || null,
          destination: payload.destination,
          purpose: payload.purpose,
          leave_date: payload.leaveDate,
          return_deadline: payload.returnDeadline,
          status: 'issued',
          issued_by: user?.id || null,
          signature_type: payload.signatureType || 'manual',
          signature_id: payload.signatureId || null,
        })
        .select()
        .single()

      if (error) throw error

      await logAudit({
        action: 'INSERT',
        tableName: 'leave_permits',
        recordId: data.id,
        newData: data,
      })

      addToast('Surat izin berhasil diterbitkan', 'success')
      await fetchPermits()
      await fetchStats()
      return { data, error: null }
    } catch (err) {
      console.error('Error creating permit:', err)
      addToast('Gagal menerbitkan surat izin', 'error')
      return { data: null, error: err }
    }
  }, [user, addToast, fetchPermits, fetchStats])

  // ─── Update leave permit ────────────────────────────────────────────────
  const updatePermit = useCallback(async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('leave_permits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await logAudit({
        action: 'UPDATE',
        tableName: 'leave_permits',
        recordId: id,
        newData: updates,
      })

      addToast('Data izin berhasil diperbarui', 'success')
      await fetchPermits()
      await fetchStats()
      return { data, error: null }
    } catch (err) {
      console.error('Error updating permit:', err)
      addToast('Gagal memperbarui data izin', 'error')
      return { data: null, error: err }
    }
  }, [addToast, fetchPermits, fetchStats])

  // ─── Cancel leave permit ────────────────────────────────────────────────
  const cancelPermit = useCallback(async (id) => {
    return updatePermit(id, { status: 'cancelled' })
  }, [updatePermit])

  // ─── Fetch active permits for gate reconcile ────────────────────────────
  const fetchActivePermits = useCallback(async (searchTerm) => {
    try {
      let query = supabase
        .from('leave_permits')
        .select(`
          *,
          student:students ( id, name, phone, photo_url,
            classes ( id, name ),
            dorms ( id, ar, building, gender )
          ),
          issuer:profiles ( id, name )
        `)
        .in('status', ['issued', 'departed'])
        .order('leave_date', { ascending: false })

      if (searchTerm && searchTerm.length >= 1) {
        query = query.ilike('student.name', `%${searchTerm}%`)
      }

      const { data, error } = await query.limit(30)
      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching active permits:', err)
      return []
    }
  }, [])

  // ─── Gate: confirm departure ────────────────────────────────────────────
  const confirmDeparture = useCallback(async (permit) => {
    try {
      // Create gate_log entry
      const { data: gateLog, error: gateError } = await supabase
        .from('gate_logs')
        .insert({
          visitor_type: 'santri',
          student_id: permit.student_id,
          visitor_name: permit.student?.name || '',
          purpose: permit.purpose,
          destination: permit.destination,
          check_in: new Date().toISOString(),
          estimated_return: permit.return_deadline,
          recorded_by: user?.id || null,
          leave_permit_id: permit.id,
        })
        .select()
        .single()

      if (gateError) throw gateError

      // Update permit status + link gate_log
      const { error: updateError } = await supabase
        .from('leave_permits')
        .update({
          status: 'departed',
          gate_log_id: gateLog.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', permit.id)

      if (updateError) throw updateError

      await logAudit({
        action: 'UPDATE',
        tableName: 'leave_permits',
        recordId: permit.id,
        newData: { status: 'departed', gate_log_id: gateLog.id },
      })

      addToast(`${permit.student?.name} dikonfirmasi berangkat`, 'success')
      await fetchPermits()
      await fetchStats()
      return { error: null }
    } catch (err) {
      console.error('Error confirming departure:', err)
      addToast('Gagal mengkonfirmasi keberangkatan', 'error')
      return { error: err }
    }
  }, [user, addToast, fetchPermits, fetchStats])

  // ─── Gate: confirm return ───────────────────────────────────────────────
  const confirmReturn = useCallback(async (permit) => {
    try {
      const now = new Date()
      const isOverdue = now > new Date(permit.return_deadline)
      const newStatus = isOverdue ? 'overdue' : 'returned'

      // Update gate_log check_out
      if (permit.gate_log_id) {
        await supabase
          .from('gate_logs')
          .update({ check_out: now.toISOString(), updated_at: now.toISOString() })
          .eq('id', permit.gate_log_id)
      }

      // Update permit status
      const { error } = await supabase
        .from('leave_permits')
        .update({ status: newStatus, updated_at: now.toISOString() })
        .eq('id', permit.id)

      if (error) throw error

      await logAudit({
        action: 'UPDATE',
        tableName: 'leave_permits',
        recordId: permit.id,
        newData: { status: newStatus },
      })

      addToast(
        isOverdue
          ? `${permit.student?.name} kembali (terlambat)`
          : `${permit.student?.name} kembali tepat waktu`,
        isOverdue ? 'warning' : 'success'
      )
      await fetchPermits()
      await fetchStats()
      return { error: null }
    } catch (err) {
      console.error('Error confirming return:', err)
      addToast('Gagal mengkonfirmasi kepulangan', 'error')
      return { error: err }
    }
  }, [addToast, fetchPermits, fetchStats])

  // ─── Fetch signatures for digital signing ───────────────────────────────
  const fetchSignatures = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('id, role, person_id, signature_url')
        .eq('is_active', true)
        .eq('role', 'pengasuh')

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching signatures:', err)
      return []
    }
  }, [])

  // ─── Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    channelRef.current = supabase
      .channel('leave_permits_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_permits' }, () => {
        fetchPermits()
        fetchStats()
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [fetchPermits, fetchStats])

  return {
    permits,
    loading,
    stats,
    searchStudents,
    fetchPermits,
    fetchStats,
    createPermit,
    updatePermit,
    cancelPermit,
    fetchActivePermits,
    confirmDeparture,
    confirmReturn,
    fetchSignatures,
  }
}
