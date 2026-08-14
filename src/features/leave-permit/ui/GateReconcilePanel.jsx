import { useState, useEffect, useCallback } from 'react'
import { Search, LogOut, LogIn, Loader2, AlertCircle, Clock, User, FileText } from 'lucide-react'
import { useDebounce } from '@shared/hooks/useDebounce'
import { supabase } from '@lib/supabase'
import LeavePermitStatusBadge from '../components/LeavePermitStatusBadge'
import { fmtDateTimeShort, fmtTime } from '../utils/leavePermitConstants'

export default function GateReconcilePanel({ onConfirmDeparture, onConfirmReturn, loading }) {
  const [search, setSearch] = useState('')
  const [permits, setPermits] = useState([])
  const [fetching, setFetching] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  const fetchActivePermits = useCallback(async (term) => {
    setFetching(true)
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

      if (term && term.length >= 1) {
        query = query.ilike('student.name', `%${term}%`)
      }

      const { data, error } = await query.limit(20)
      if (!error) setPermits(data || [])
    } catch (err) {
      console.error('Error fetching active permits:', err)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchActivePermits(debouncedSearch)
  }, [debouncedSearch, fetchActivePermits])

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama santri..."
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all"
        />
        {fetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
        )}
      </div>

      {/* Permit list */}
      {permits.length === 0 && !fetching ? (
        <div className="text-center py-8">
          <FileText className="w-8 h-8 mx-auto text-[var(--color-text-muted)]/30 mb-2" />
          <p className="text-sm text-[var(--color-text-muted)]">Tidak ada izin aktif</p>
        </div>
      ) : (
        <div className="space-y-2">
          {permits.map((permit) => {
            const student = permit.student || {}
            const isIssued = permit.status === 'issued'
            const isDeparted = permit.status === 'departed'
            const isOverdue = isDeparted && new Date(permit.return_deadline) < new Date()

            return (
              <div
                key={permit.id}
                className={`p-3 rounded-xl border transition-all ${
                  isOverdue
                    ? 'border-red-300 bg-red-50/50'
                    : isDeparted
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--color-border)]">
                    {student.photo_url
                      ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                      : <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-[var(--color-text)] truncate">{student.name}</span>
                      <LeavePermitStatusBadge status={permit.status} size="xs" />
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mb-1">
                      {student.classes?.name || '-'} &middot; {student.dorms?.ar || student.dorms?.building || '-'}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--color-text-muted)]">
                      <span>Tujuan: <strong>{permit.destination}</strong></span>
                      <span>Batas: <strong className={isOverdue ? 'text-red-600' : ''}>{fmtDateTimeShort(permit.return_deadline)}</strong></span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                      {isIssued && (
                        <button
                          onClick={() => onConfirmDeparture?.(permit)}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                          Berangkat
                        </button>
                      )}
                      {isDeparted && (
                        <button
                          onClick={() => onConfirmReturn?.(permit)}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                          Kembali
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
